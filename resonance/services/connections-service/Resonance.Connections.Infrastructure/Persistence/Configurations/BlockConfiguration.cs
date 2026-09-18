using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Infrastructure.Persistence.Configurations;

public class BlockConfiguration : IEntityTypeConfiguration<Block>
{
    public void Configure(EntityTypeBuilder<Block> builder)
    {
        builder.HasKey(b => b.Id);

        builder.HasIndex(b => new { b.BlockerUserId, b.BlockedUserId }).IsUnique();
    }
}
