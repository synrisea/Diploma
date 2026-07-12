using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Infrastructure.Persistence.Configurations;

public class QuickFeedbackConfiguration : IEntityTypeConfiguration<QuickFeedback>
{
    public void Configure(EntityTypeBuilder<QuickFeedback> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Comment).IsRequired().HasMaxLength(2000);

        builder.HasIndex(f => f.PlaceId);
    }
}