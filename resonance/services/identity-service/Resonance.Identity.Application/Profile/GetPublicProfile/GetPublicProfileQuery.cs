using MediatR;

namespace Resonance.Identity.Application.Profile.GetPublicProfile;

public record GetPublicProfileQuery(Guid UserId) : IRequest<PublicProfileDto?>;
