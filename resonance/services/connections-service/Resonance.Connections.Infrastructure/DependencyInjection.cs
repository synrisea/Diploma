using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Infrastructure.Persistence;
using Resonance.Connections.Infrastructure.Push;

namespace Resonance.Connections.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' not found.");

        services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        var pushBaseUrl = configuration["Push:ExpoBaseUrl"] ?? "https://exp.host";
        services.AddHttpClient<IPushSender, ExpoPushSender>(client =>
        {
            client.BaseAddress = new Uri(pushBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        return services;
    }
}
