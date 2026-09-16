using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Infrastructure.Persistence.Configurations;

public class EmailChangeRequestConfiguration : IEntityTypeConfiguration<EmailChangeRequest>
{
    public void Configure(EntityTypeBuilder<EmailChangeRequest> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.NewEmail).IsRequired().HasMaxLength(256);
        builder.Property(r => r.OldEmailTokenHash).IsRequired().HasMaxLength(128);
        builder.Property(r => r.NewEmailTokenHash).IsRequired().HasMaxLength(128);

        builder.HasIndex(r => r.OldEmailTokenHash).IsUnique();
        builder.HasIndex(r => r.NewEmailTokenHash).IsUnique();
        builder.HasIndex(r => r.UserId);
    }
}