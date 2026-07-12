using Microsoft.EntityFrameworkCore;
using Resonance.Feedback.Application.Common;
using Resonance.Feedback.Domain.Entities;

namespace Resonance.Feedback.Infrastructure.Persistence;

public class ApplicationDbContext: DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
        
    }

    public DbSet<QuickFeedback> QuickFeedbacks => Set<QuickFeedback>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}