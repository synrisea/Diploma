using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Common;

public interface IApplicationDbContext
{
    DbSet<VisitIntent> VisitIntents { get; }
    DbSet<Conversation> Conversations { get; }
    DbSet<Message> Messages { get; }
    DbSet<Block> Blocks { get; }
    DbSet<FriendRequest> FriendRequests { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
