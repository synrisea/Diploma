using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Infrastructure.Persistence.Configurations;

public class QuickFeedbackPhotoConfiguration : IEntityTypeConfiguration<QuickFeedbackPhoto>
{
    public void Configure(EntityTypeBuilder<QuickFeedbackPhoto> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Url).IsRequired().HasMaxLength(1000);

        builder.HasIndex(p => p.QuickFeedbackId);

        builder.HasOne<QuickFeedback>()
            .WithMany()
            .HasForeignKey(p => p.QuickFeedbackId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
