"""
Warning Classification Engine (Step 10 / spec §8).

Classifies a correlated set of WarningSignals into one of 5 standard categories:
- ACADEMIC_DIFFICULTY
- DISENGAGEMENT
- FINANCIAL_DIFFICULTY
- HEALTH_PERSONAL
- GENERAL_EARLY_WARNING

Classification is strictly deterministic and based on the detected signal combination.
For HEALTH_PERSONAL:
- NEVER diagnoses or infers a condition.
- Uses strictly neutral language pointing to an observed pattern for human check-in.
"""
from typing import Set

from app.models.alerts import WarningCategory
from app.models.signals import SignalType
from app.engines.correlation_engine import CorrelationResult


def classify_signals(result: CorrelationResult) -> WarningCategory:
    """
    Evaluates signal types and determines the appropriate warning category.
    """
    signals: Set[SignalType] = set(result.signal_types)

    # 1. Financial Difficulty:
    # Fee issue present with or without attendance/engagement decline
    if SignalType.FINANCIAL in signals:
        return WarningCategory.FINANCIAL_DIFFICULTY

    # 2. Academic Difficulty:
    # Combinations involving Marks, Assignments, and Backlogs
    academic_signals = {SignalType.MARKS, SignalType.ASSIGNMENT, SignalType.BACKLOG}
    has_academic = bool(signals & academic_signals)
    has_attendance = SignalType.ATTENDANCE in signals

    # Scenario 3: Attendance + Marks + Assignments (or any 2+ academic signals)
    if len(signals & academic_signals) >= 2 or (has_attendance and len(signals & academic_signals) >= 1 and (SignalType.MARKS in signals or SignalType.ASSIGNMENT in signals)):
        return WarningCategory.ACADEMIC_DIFFICULTY

    # 3. Disengagement:
    # Declining LMS engagement + library visits or attendance without academic failure
    engagement_signals = {SignalType.ENGAGEMENT, SignalType.LIBRARY}
    if (signals & engagement_signals) and has_attendance and not has_academic:
        return WarningCategory.DISENGAGEMENT

    # Engagement + Library together without attendance
    if len(signals & engagement_signals) >= 2 and not has_academic:
        return WarningCategory.DISENGAGEMENT

    # 4. Health / Personal Check-in:
    # Marked by an authorized staff behaviour flag, OR sudden multi-system withdrawal
    # (attendance + engagement) where academic history was previously sound
    if SignalType.BEHAVIOUR in signals:
        return WarningCategory.HEALTH_PERSONAL

    # 5. Fallback: General early warning
    return WarningCategory.GENERAL_EARLY_WARNING
