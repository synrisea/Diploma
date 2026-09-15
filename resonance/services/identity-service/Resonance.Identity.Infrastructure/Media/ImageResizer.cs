using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using Resonance.Identity.Application.Common;
using Microsoft.EntityFrameworkCore.Storage.Json;

namespace Resonance.Identity.Infrastructure.Media;

public class ImageResizer : IImageResizer
{
    public async Task<byte[]> ResizeToWebpAsync(Stream source, int maxDimension, CancellationToken cancellationToken)
    {
        using var image = await Image.LoadAsync(source, cancellationToken);

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Mode = ResizeMode.Max,
            Size = new Size(maxDimension, maxDimension),
        }));

        using var output = new MemoryStream();
        await image.SaveAsync(output, new WebpEncoder(), cancellationToken);
        return output.ToArray();
    }
}