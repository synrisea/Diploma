using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Application.Common;

public interface IApplicationDbContext
{
    DbSet<QuickFeedback> QuickFeedbacks { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

}