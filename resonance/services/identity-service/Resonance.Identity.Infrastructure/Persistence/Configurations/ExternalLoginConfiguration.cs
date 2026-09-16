using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Infrastructure.Persistence.Configurations;

public class ExternalLoginConfiguration : IEntityTypeConfiguration<ExternalLogin>
{
    public void Configure(EntityTypeBuilder<ExternalLogin> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ProviderUserId).IsRequired().HasMaxLength(256);
        builder.Property(e => e.Email).IsRequired().HasMaxLength(256);

        builder.HasIndex(e => new { e.Provider, e.ProviderUserId }).IsUnique();
        builder.HasIndex(e => e.UserId);
    }
}
