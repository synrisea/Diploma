using System.Runtime.CompilerServices;
using MediatR;

namespace Resonance.Identity.Application.Auth.Register;

public record RegisterCommand(string Email, string Password, string DisplayName) : IRequest<AuthResponseDto>;