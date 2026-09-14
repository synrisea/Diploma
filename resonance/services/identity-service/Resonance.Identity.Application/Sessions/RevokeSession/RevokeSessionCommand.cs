using MediatR;

namespace Resonance.Identity.Application.Sessions.RevokeSession;

public record RevokeSessionCommand(Guid UserId, Guid SessionId) : IRequest;