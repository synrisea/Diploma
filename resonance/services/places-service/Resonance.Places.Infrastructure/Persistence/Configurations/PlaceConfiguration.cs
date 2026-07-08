using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Places.Domain.Entities;

namespace Resonance.Places.Infrastructure.Persistance.Configurations;

public class PlaceConfiguration : IEntityTypeConfiguration<Place>
{
    public void Configure(EntityTypeBuilder<Place> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);
        
        builder.Property(p => p.Location)
            .HasColumnType("geometry (point, 4326)")
            .IsRequired();
        
        builder.HasIndex(p => p.Location)
            .HasMethod("GIST");
        builder.Property(p => p.Address).HasMaxLength(300);

        builder.HasOne(p => p.Category)
            .WithMany()
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.OsmId).IsUnique();
    }
}