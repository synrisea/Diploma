using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Places.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWheelchairToPlace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Wheelchair",
                table: "Places",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Wheelchair",
                table: "Places");
        }
    }
}
