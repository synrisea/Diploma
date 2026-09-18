using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Infrastructure.Persistence.Configurations;

public class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Status).HasConversion<string>();

        builder.HasIndex(f => f.RequesterId);
        builder.HasIndex(f => f.RecipientId);
    }
}
