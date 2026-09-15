using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Infrastructure.Media;

public class S3AvatarStorage : IAvatarStorage
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucketName;
    private readonly string _publicBaseUrl;

    public S3AvatarStorage(IAmazonS3 s3, IConfiguration configuration)
    {
        _s3 = s3;
        _bucketName = configuration["Aws:AvatarsBucketName"]
            ?? throw new InvalidOperationException("Aws:AvatarsBucketName is not configured");
        var region = configuration["Aws:Region"]
            ?? throw new InvalidOperationException("Aws:Region is not configured.");
       
       _publicBaseUrl = $"https://{_bucketName}.s3.{region}.amazonaws.com";
    }

    public async Task<string> UploadAsync(Guid userId, string variantFileName, byte[] content, CancellationToken cancellationToken)
    {
        var key = $"avatars/{userId}/{variantFileName}";
        using var stream = new MemoryStream(content);

        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = "image/webp",
            CannedACL = S3CannedACL.PublicRead,
        }, cancellationToken);

        return $"{_publicBaseUrl}/{key}";
    }

    public async Task DeleteAllAsync(Guid userId, CancellationToken cancellationToken)
    {
        var prefix = $"avatars/{userId}/";
        var listed = await _s3.ListObjectsV2Async(new ListObjectsV2Request
        {
            BucketName = _bucketName,
            Prefix = prefix,
        }, cancellationToken);

        if (listed.S3Objects.Count == 0) return;

        await _s3.DeleteObjectsAsync(new DeleteObjectsRequest
        {
            BucketName = _bucketName,
            Objects = listed.S3Objects.Select(o => new KeyVersion {Key = o.Key}).ToList(),
        }, cancellationToken);
    }
}