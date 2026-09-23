using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Infrastructure.Persistence.Configurations;

public class PasswordChangeRequestConfiguration : IEntityTypeConfiguration<PasswordChangeRequest>
{
    public void Configure(EntityTypeBuilder<PasswordChangeRequest> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.NewPasswordHash).IsRequired().HasMaxLength(256);
        builder.Property(r => r.TokenHash).IsRequired().HasMaxLength(128);

        builder.HasIndex(r => r.TokenHash).IsUnique();
        builder.HasIndex(r => r.UserId);
    }
}
