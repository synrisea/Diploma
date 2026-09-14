using MediatR;

namespace Resonance.Identity.Application.Profile.GetMe;

public record GetMeQuery(Guid UserId) : IRequest<UserProfileDto>;
