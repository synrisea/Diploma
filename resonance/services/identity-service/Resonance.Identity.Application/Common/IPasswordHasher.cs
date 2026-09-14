using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public interface IPasswordHasher
{
    (string Hash, PasswordHashAlgorithm Algorithm) HashNew(string password);
    bool Verify(string password, string passwordHash, PasswordHashAlgorithm algorithm);
}