namespace Resonance.Connections.Application.Intents;

public static class TimeBuckets
{
    public static readonly string[] Allowed = ["Today", "Tomorrow", "ThisWeekend"];

    public static bool IsValid(string timeBucket) => Allowed.Contains(timeBucket);

    public static DateTime ComputeExpiresAt(string timeBucket, DateTime now)
    {
        var today = now.Date;
        return timeBucket switch
        {
            "Today" => today.AddDays(1),
            "Tomorrow" => today.AddDays(2),
            "ThisWeekend" => NextSunday(today).AddDays(1),
            _ => throw new ArgumentException("Unknown time bucket.", nameof(timeBucket)),
        };
    }

    private static DateTime NextSunday(DateTime from)
    {
        if (from.DayOfWeek == DayOfWeek.Sunday) return from;
        var daysUntilSunday = ((int)DayOfWeek.Sunday - (int)from.DayOfWeek + 7) % 7;
        return from.AddDays(daysUntilSunday);
    }
}
