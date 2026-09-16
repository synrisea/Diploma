using MediatR;

namespace Resonance.Identity.Application.EmailChange.StartEmailChange;

public record StartEmailChangeCommand(Guid UserId, string NewEmail) : IRequest;