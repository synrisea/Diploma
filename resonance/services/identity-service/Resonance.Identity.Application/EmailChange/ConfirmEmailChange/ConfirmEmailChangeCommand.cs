using MediatR;

namespace Resonance.Identity.Application.EmailChange.ConfirmEmailChange;

public record ConfirmEmailChangeCommand(string Token) : IRequest<bool>;