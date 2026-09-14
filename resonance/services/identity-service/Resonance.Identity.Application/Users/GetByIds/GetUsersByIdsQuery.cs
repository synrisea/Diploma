using MediatR;

namespace Resonance.Identity.Application.Users.GetByIds;

public record GetUsersByIdsQuery(IReadOnlyList<Guid> Ids) : IRequest<List<UserSummaryDto>>;
