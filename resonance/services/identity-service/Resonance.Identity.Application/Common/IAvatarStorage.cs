namespace Resonance.Identity.Application.Common;

public interface IAvatarStorage
{
    Task<string> UploadAsync(Guid userId, string variantFileName, byte[] content, CancellationToken cancellationToken);
    Task DeleteAllAsync(Guid userId, CancellationToken cancellationToken);
}