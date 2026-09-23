using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Infrastructure.Persistence.Configurations;

public class DeviceTokenConfiguration : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Platform).IsRequired().HasMaxLength(20);

        builder.HasIndex(t => t.Token).IsUnique();
        builder.HasIndex(t => t.UserId);
    }
}
