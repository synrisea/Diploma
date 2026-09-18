using MediatR;

namespace Resonance.Identity.Application.Users.Search;

public record SearchUsersQuery(string Query) : IRequest<List<UserSearchResultDto>>;
