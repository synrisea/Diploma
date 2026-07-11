using MediatR;

namespace Resonance.Identity.Application.Auth.Login;

public record LoginCommand(string Email, string Password): IRequest<AuthResponseDto>;