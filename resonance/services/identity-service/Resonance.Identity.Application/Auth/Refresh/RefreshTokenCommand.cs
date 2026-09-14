using MediatR;

namespace Resonance.Identity.Application.Auth.Refresh;

public record RefreshTokenCommand(string RefreshToken, string? DeviceLabel, string? IpAddress) : IRequest<AuthResponseDto>;