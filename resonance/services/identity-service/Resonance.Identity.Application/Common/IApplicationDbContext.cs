using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public interface IApplicationDbContext
{
    DbSet<User> Users{ get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}