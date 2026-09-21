namespace Resonance.Connections.Application.Intents;

public static class VisitDates
{
    public const int MaxDaysAhead = 365;

    /// <summary>A day's grace is allowed because the caller's local date can be a day
    /// behind or ahead of UTC, and rejecting "today" for someone in Baku at 02:00 would
    /// be surprising.</summary>
    public static bool IsValid(DateOnly visitDate, DateOnly today) =>
        visitDate >= today.AddDays(-1) && visitDate <= today.AddDays(MaxDaysAhead);

    public static DateTime ComputeExpiresAt(DateOnly visitDate) =>
        visitDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddDays(1);
}
