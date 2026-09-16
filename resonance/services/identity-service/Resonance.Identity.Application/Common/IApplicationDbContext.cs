using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public interface IApplicationDbContext
{
    DbSet<User> Users{ get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<EmailChangeRequest> EmailChangeRequests  { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}