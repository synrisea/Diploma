using MediatR;

namespace Resonance.Identity.Application.Profile.DeleteAvatar;

public record DeleteAvatarCommand(Guid UserId) : IRequest;