using MediatR;

namespace Resonance.Identity.Application.Sessions.RevokeOtherSessions;

public record RevokeOtherSessionsCommand(Guid UserId, Guid CurrentSessionId) : IRequest;