using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash).IsRequired();

        builder.Property(u => u.DisplayName).IsRequired().HasMaxLength(100);

        builder.Property(u => u.Bio).HasMaxLength(500);
        builder.Property(u => u.Interests).HasDefaultValueSql("'{}'");
        builder.Property(u => u.PreferredLanguage).HasMaxLength(10);
    }
}