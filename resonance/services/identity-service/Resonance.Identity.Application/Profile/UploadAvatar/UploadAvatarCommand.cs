using MediatR;

namespace Resonance.Identity.Application.Profile.UploadAvatar;

public record UploadAvatarCommand(Guid UserId, Stream Content, string ContentType, long ContentLength) : IRequest<string>;