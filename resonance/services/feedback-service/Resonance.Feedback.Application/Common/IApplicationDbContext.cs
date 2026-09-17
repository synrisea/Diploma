using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Application.Common;

public interface IApplicationDbContext
{
    DbSet<QuickFeedback> QuickFeedbacks { get; }
    DbSet<QuickFeedbackPhoto> QuickFeedbackPhotos { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

}