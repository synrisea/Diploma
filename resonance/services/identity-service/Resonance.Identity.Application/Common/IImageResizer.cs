namespace Resonance.Identity.Application.Common;

public interface IImageResizer
{
    Task<byte[]> ResizeToWebpAsync(Stream source, int maxDimension, CancellationToken cancellationToken);
}