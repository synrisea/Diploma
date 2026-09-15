using Amazon;
using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Infrastructure.Media;
using Resonance.Identity.Infrastructure.Persistence;
using Resonance.Identity.Infrastructure.Security;

namespace Resonance.Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' not found.");
        
        services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        services.AddSingleton<IAmazonS3>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var accessKey = config["Aws:AccessKeyId"] ?? throw new InvalidOperationException("Aws:AccessKeyId is not configured.");
            var secretKey = config["Aws:SecretAccessKey"] ?? throw new InvalidOperationException("Aws:SecretAccessKey is not configured.");
            var region = config["Aws:Region"] ?? throw new InvalidOperationException("Aws:Region is not configured.");

            return new AmazonS3Client(accessKey, secretKey, RegionEndpoint.GetBySystemName(region));
        });

        services.AddScoped<IImageResizer, ImageResizer>();
        services.AddScoped<IAvatarStorage, S3AvatarStorage>();
        return services;
    }
}