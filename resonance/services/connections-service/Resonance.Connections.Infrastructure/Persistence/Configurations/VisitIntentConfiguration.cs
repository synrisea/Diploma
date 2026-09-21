using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Infrastructure.Persistence.Configurations;

public class VisitIntentConfiguration : IEntityTypeConfiguration<VisitIntent>
{
    public void Configure(EntityTypeBuilder<VisitIntent> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.IntentTag).HasMaxLength(60);

        builder.HasIndex(i => i.PlaceId);
        builder.HasIndex(i => i.VisitDate);
        builder.HasIndex(i => new { i.UserId, i.PlaceId }).IsUnique();
    }
}
