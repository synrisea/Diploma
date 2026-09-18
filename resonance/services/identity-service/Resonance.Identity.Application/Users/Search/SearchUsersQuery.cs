using MediatR;
using Resonance.Identity.Application.Users.GetByIds;

namespace Resonance.Identity.Application.Users.Search;

public record SearchUsersQuery(string Query) : IRequest<List<UserSummaryDto>>;
