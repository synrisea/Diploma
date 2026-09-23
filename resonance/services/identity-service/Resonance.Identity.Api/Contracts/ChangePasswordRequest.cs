namespace Resonance.Identity.Api.Contracts;

public record ChangePasswordRequest(string? CurrentPassword, string NewPassword);
