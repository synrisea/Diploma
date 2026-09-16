using MediatR;

namespace Resonance.Identity.Application.Auth.GoogleSignIn;

public record GoogleSignInCommand(string ProviderUserId, string Email, string DisplayName, string? DeviceLabel, string? IpAddress) : IRequest<AuthResponseDto>;