using MediatR;

namespace Resonance.Identity.Application.Auth.Login;

public record LoginCommand(string Email, string Password, string? DeviceLabel, string? IpAddress) : IRequest<AuthResponseDto>;
