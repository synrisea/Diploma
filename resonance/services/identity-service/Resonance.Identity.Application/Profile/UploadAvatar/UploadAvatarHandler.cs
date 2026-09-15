using System.ComponentModel;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Profile.UploadAvatar;

public class UploadAvatarHandler : IRequestHandler<UploadAvatarCommand, string>
{
    private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxContentLength = 5 * 1024 * 1024;

    private readonly IApplicationDbContext _context;
    private readonly IImageResizer _imageResizer;
    private readonly IAvatarStorage _avatarStorage;

    public UploadAvatarHandler(IApplicationDbContext context, IImageResizer imageResizer, IAvatarStorage avatarStorage)
    {
        _context = context;
        _imageResizer = imageResizer;
        _avatarStorage = avatarStorage;
    }

    public async Task<string> Handle(UploadAvatarCommand request, CancellationToken cancellationToken)
    {
        if (!AllowedContentTypes.Contains(request.ContentType))
            throw new ArgumentException("Avatar must be a JPEG, PNG, or WEBP image.");
        if (request.ContentLength > MaxContentLength)
            throw new ArgumentException("Avatar must be 5MB or smaller.");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        
        var large = await _imageResizer.ResizeToWebpAsync(request.Content, 256, cancellationToken);
        var largeUrl = await _avatarStorage.UploadAsync(request.UserId, "256.webp", large, cancellationToken);

        request.Content.Position = 0;

        var small = await _imageResizer.ResizeToWebpAsync(request.Content, 64, cancellationToken);
        await _avatarStorage.UploadAsync(request.UserId, "64.webp", small, cancellationToken);

        user.UpdateAvatarUrl(largeUrl);
        await _context.SaveChangesAsync(cancellationToken);

        return largeUrl;
    }   
}