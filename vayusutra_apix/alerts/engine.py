"""
VayuSutra APIx - Statutory Alert Rule Engine
Evaluates threshold spikes, CPI pass-through surges, pressure score transitions, and data quality degradation.
"""

import datetime
import uuid
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from ..config.db import get_db_connection

logger = logging.getLogger("vayusutra.alerts")


class AlertRuleDefinition(BaseModel):
    """Schema for configurable alert rule."""
    rule_id: Optional[str] = Field(default=None, description="Unique rule ID")
    rule_name: str = Field(..., description="Descriptive rule title")
    metric_target: str = Field(..., description="Target metric: daily_pct_change, bps_transport_impact, pressure_score, overall_trust_score, anomaly_severity")
    condition_operator: str = Field(default=">", description="Comparison operator: >, <, >=, <=, ==")
    threshold_value: float = Field(..., description="Threshold numeric value")
    severity: str = Field(default="HIGH", description="Severity level: LOW, MEDIUM, HIGH, CRITICAL")
    is_enabled: int = Field(default=1, description="1 if active, 0 if disabled")


@dataclass
class AlertRecord:
    """Individual triggered alert record."""
    alert_id: str
    rule_id: Optional[str]
    title: str
    message: str
    severity: str
    status: str              # ACTIVE, ACKNOWLEDGED, RESOLVED
    triggered_at: str
    resolved_at: Optional[str]
    acknowledged_by: Optional[str]


class AlertEngine:
    """
    Evaluates rules continuously and maintains persistent alert logs.
    """

    SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    METRIC_LABELS = {
        "daily_pct_change": "National Index Daily Change (%)",
        "bps_transport_impact": "CPI Transport Pass-Through (bps)",
        "pressure_score": "Airfare Inflation Pressure Score",
        "overall_trust_score": "Data Trust Score",
        "anomaly_severity": "Maximum Market Anomaly Severity",
    }

    def get_rules(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM alert_rules ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def create_rule(self, rule: AlertRuleDefinition) -> Dict[str, Any]:
        conn = get_db_connection()
        # Idempotency: if an identical rule already exists, return its rule_id
        # instead of accumulating duplicates from repeated submissions / test runs.
        existing = conn.execute(
            """
            SELECT rule_id FROM alert_rules
            WHERE rule_name = ? AND metric_target = ? AND condition_operator = ?
            AND threshold_value = ?
            """,
            (rule.rule_name, rule.metric_target, rule.condition_operator, rule.threshold_value),
        ).fetchone()
        if existing:
            return {
                "status": "SUCCESS",
                "message": f"Alert rule '{rule.rule_name}' already exists (idempotent).",
                "rule_id": existing["rule_id"],
                "duplicate": True,
            }

        rule_id = rule.rule_id or f"RULE-{uuid.uuid4().hex[:6].upper()}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO alert_rules (
                    rule_id, rule_name, metric_target, condition_operator,
                    threshold_value, severity, is_enabled, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rule_id, rule.rule_name, rule.metric_target, rule.condition_operator,
                rule.threshold_value, rule.severity, rule.is_enabled, now_iso
            ))

        return {
            "status": "SUCCESS",
            "message": f"Alert rule '{rule.rule_name}' created.",
            "rule_id": rule_id
        }

    def collect_current_metrics(self) -> Dict[str, Any]:
        """
        Gathers live, deterministic metrics from the database and analytics
        engines so alert rules are always evaluated against real computed values.
        """
        conn = get_db_connection()
        metrics: Dict[str, Any] = {}

        row = conn.execute(
            "SELECT * FROM national_indices ORDER BY calculation_date DESC LIMIT 1"
        ).fetchone()
        if row:
            metrics["calculation_date"] = row["calculation_date"]
            metrics["daily_pct_change"] = row["daily_pct_change"]
            metrics["bps_transport_impact"] = row["bps_transport_impact"]
            metrics["bps_headline_cpi_impact"] = row["bps_headline_cpi_impact"]

        # Inflation Pressure Score (computed from live index panels)
        try:
            from ..analytics.pressure_score import get_inflation_pressure_score
            pressure = get_inflation_pressure_score(target_date=metrics.get("calculation_date"))
            metrics["pressure_score"] = pressure.pressure_score
            metrics["pressure_level"] = pressure.pressure_level
        except Exception as e:  # pragma: no cover
            logger.debug(f"Pressure score unavailable for alerts: {e}")

        # Data Trust Score (computed from live observation pipeline)
        try:
            from ..data_quality.trust_score import get_latest_data_quality
            dq = get_latest_data_quality()
            metrics["overall_trust_score"] = dq.overall_trust_score
        except Exception as e:  # pragma: no cover
            logger.debug(f"Data quality unavailable for alerts: {e}")

        # Maximum severity of genuinely detected market anomalies on the latest day
        try:
            from ..anomaly.detector import detector as anomaly_detector
            anomalies = anomaly_detector.scan_anomalies(target_date=metrics.get("calculation_date"))
            metrics["anomaly_severity"] = max(
                (self.SEVERITY_RANK.get(a.severity, 0) for a in anomalies), default=0
            )
            metrics["active_anomalies_count"] = len(anomalies)
        except Exception as e:  # pragma: no cover
            logger.debug(f"Anomaly severity unavailable for alerts: {e}")
            metrics["anomaly_severity"] = 0

        metrics["metric_labels"] = self.METRIC_LABELS
        return metrics

    def evaluate_live_triggers(self, current_metrics: Dict[str, Any]) -> List[AlertRecord]:
        """
        Tests current metric values against all active alert rules and creates
        alert records. A rule is skipped when an identical ACTIVE/ACKNOWLEDGED
        alert is already open, preventing duplicate spam.
        """
        conn = get_db_connection()
        rules = conn.execute("SELECT * FROM alert_rules WHERE is_enabled = 1").fetchall()
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        triggered = []

        for r in rules:
            target = r["metric_target"]
            val = current_metrics.get(target)
            if val is None:
                continue

            thresh = r["threshold_value"]
            op = r["condition_operator"]
            is_fired = False

            if op == ">" and val > thresh:
                is_fired = True
            elif op == "<" and val < thresh:
                is_fired = True
            elif op == ">=" and val >= thresh:
                is_fired = True
            elif op == "<=" and val <= thresh:
                is_fired = True
            elif op == "==" and val == thresh:
                is_fired = True

            if not is_fired:
                continue

            # Deduplicate: keep at most one open alert per rule.
            open_alert = conn.execute(
                "SELECT alert_id FROM alerts WHERE rule_id = ? AND status IN ('ACTIVE', 'ACKNOWLEDGED') LIMIT 1",
                (r["rule_id"],),
            ).fetchone()
            if open_alert:
                continue

            alert_id = f"ALT-{now_iso[:10].replace('-', '')}-{uuid.uuid4().hex[:6].upper()}"
            metric_label = self.METRIC_LABELS.get(target, target)
            title = f"{r['severity']} Alert: {r['rule_name']}"
            msg = (
                f"Observed {metric_label} = {val:.4g} crossed configured threshold "
                f"({op} {thresh:g}). Action required by policy desk."
            )

            with conn:
                conn.execute("""
                    INSERT OR REPLACE INTO alerts (
                        alert_id, rule_id, title, message, severity, status, triggered_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (alert_id, r["rule_id"], title, msg, r["severity"], "ACTIVE", now_iso))

            triggered.append(AlertRecord(
                    alert_id=alert_id,
                    rule_id=r["rule_id"],
                    title=title,
                    message=msg,
                    severity=r["severity"],
                    status="ACTIVE",
                    triggered_at=now_iso,
                    resolved_at=None,
                    acknowledged_by=None
                ))

        return triggered

    def get_alerts(self, status_filter: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Returns the persistent alert log. Only records genuinely triggered and
        stored in the database are returned - no synthetic/demo fallbacks.
        """
        conn = get_db_connection()
        query = "SELECT * FROM alerts"
        params = []
        if status_filter:
            query += " WHERE status = ?"
            params.append(status_filter.upper())
        query += " ORDER BY triggered_at DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def update_alert(self, alert_id: str, new_status: str, actor: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        row = conn.execute("SELECT 1 FROM alerts WHERE alert_id = ?", (alert_id,)).fetchone()
        if not row:
            return {
                "status": "NOT_FOUND",
                "message": f"Alert '{alert_id}' does not exist in the alert log.",
                "alert_id": alert_id,
            }

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        resolved_time = now_iso if new_status.upper() == "RESOLVED" else None

        with conn:
            conn.execute("""
                UPDATE alerts
                SET status = ?, resolved_at = COALESCE(resolved_at, ?), acknowledged_by = COALESCE(acknowledged_by, ?)
                WHERE alert_id = ?
            """, (new_status.upper(), resolved_time, actor, alert_id))

        return {
            "status": "SUCCESS",
            "message": f"Alert {alert_id} updated to {new_status.upper()}.",
            "alert_id": alert_id,
            "updated_at": now_iso
        }


alert_engine = AlertEngine()


def get_active_alerts(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    return alert_engine.get_alerts(status_filter=status_filter)


def create_alert_rule(rule: AlertRuleDefinition) -> Dict[str, Any]:
    return alert_engine.create_rule(rule)


def update_alert_status(alert_id: str, new_status: str, actor: Optional[str] = None) -> Dict[str, Any]:
    return alert_engine.update_alert(alert_id, new_status, actor)
