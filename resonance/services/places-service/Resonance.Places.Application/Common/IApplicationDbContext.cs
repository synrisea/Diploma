using Microsoft.EntityFrameworkCore;
using Resonance.Places.Domain.Entities;

namespace Resonance.Places.Application.Common;

public interface IApplicationDbContext
{
    DbSet<Place> Places {get; }
    DbSet<Category> Categories {get; }
}

