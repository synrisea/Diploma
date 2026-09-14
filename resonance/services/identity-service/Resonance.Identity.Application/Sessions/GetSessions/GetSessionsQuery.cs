using MediatR;

namespace Resonance.Identity.Application.Sessions.GetSessions;

public record GetSessionsQuery(Guid UserId, Guid? CurrentSessionId) : IRequest<List<SessionDto>>;