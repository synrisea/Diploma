using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Infrastructure.Security;

public class PasswordHasher : IPasswordHasher
{
    private const int Argon2SaltSize = 16;
    private const int Argon2HashSize = 32;
    private const int Argon2Iterations = 4;
    private const int Argon2MemorySizeKb = 65536;
    private const int Argon2DegreeOfParallelism = 2;

    public (string Hash, PasswordHashAlgorithm Algorithm) HashNew(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(Argon2SaltSize);
        var hash = HashArgon2(password, salt);
        var encoded = $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";

        return (encoded, PasswordHashAlgorithm.Argon2id);
    }

    public bool Verify(string password, string passwordHash, PasswordHashAlgorithm algorithm) => algorithm switch
    {
        PasswordHashAlgorithm.BCrypt => BCrypt.Net.BCrypt.Verify(password, passwordHash),
        PasswordHashAlgorithm.Argon2id => VerifyArgon2(password, passwordHash),
        _ => throw new ArgumentOutOfRangeException(nameof(algorithm), algorithm, "Unknown password hash algorithm"),
    };

    private static bool VerifyArgon2(string password, string passwordHash)
    {
        var parts = passwordHash.Split('.');
        if (parts.Length != 2)
            return false;

        var salt = Convert.FromBase64String(parts[0]);
        var expectedHash = Convert.FromBase64String(parts[1]);
        var actualHash = HashArgon2(password, salt);

        return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
    }

    private static byte[] HashArgon2(string password, byte[] salt)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = Argon2DegreeOfParallelism,
            Iterations = Argon2Iterations,
            MemorySize = Argon2MemorySizeKb,
        };

        return argon2.GetBytes(Argon2HashSize);
    }
}