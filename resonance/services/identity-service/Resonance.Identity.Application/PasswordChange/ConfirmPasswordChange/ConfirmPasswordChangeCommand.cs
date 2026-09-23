using MediatR;

namespace Resonance.Identity.Application.PasswordChange.ConfirmPasswordChange;

public record ConfirmPasswordChangeCommand(string Token) : IRequest<bool>;
