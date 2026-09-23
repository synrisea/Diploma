namespace Resonance.Connections.Application.Intents;

public static class VisitDates
{
    public const int MaxDaysAhead = 365;

    public static bool IsValid(DateOnly visitDate, DateOnly today) =>
        visitDate >= today.AddDays(-1) && visitDate <= today.AddDays(MaxDaysAhead);

    public static DateTime ComputeExpiresAt(DateOnly visitDate) =>
        visitDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddDays(1);
}
