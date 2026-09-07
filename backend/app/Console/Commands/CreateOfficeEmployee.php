<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Creates or updates an office-module account (Office Management, Accounts,
 * Attendance). These live in `employees`, separate from the booking
 * system's `users` table.
 */
class CreateOfficeEmployee extends Command
{
    protected $signature = 'office:employee
                            {email : Login email}
                            {--name= : Full name (defaults to the email local part)}
                            {--password= : Password (min 6 chars); prompted when omitted}
                            {--role=Employee : Admin or Employee}';

    protected $description = 'Create or update an office module employee/admin account';

    public function handle(): int
    {
        $email = strtolower(trim($this->argument('email')));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Enter a valid email address.');

            return self::FAILURE;
        }

        $role = $this->option('role') === 'Admin' ? 'Admin' : 'Employee';
        $password = $this->option('password') ?: $this->secret('Password (min 6 characters)');

        if (mb_strlen((string) $password) < 6) {
            $this->error('Password must be at least 6 characters.');

            return self::FAILURE;
        }

        $roleId = DB::table('roles')->where('name', $role)->value('id');

        if (! $roleId) {
            $this->error("Role '{$role}' is missing — run the schema SQL first.");

            return self::FAILURE;
        }

        $name = $this->option('name') ?: ucfirst(strtok($email, '@'));
        $existingId = DB::table('employees')->where('email', $email)->value('id');

        $attributes = [
            'full_name' => $name,
            'role_id' => $roleId,
            'password_hash' => Hash::make($password),
            // Set by an admin, so the account is usable immediately.
            'must_change_password' => 0,
            'is_active' => 1,
            'api_token_hash' => null,
            'updated_at' => now(),
        ];

        if ($existingId) {
            DB::table('employees')->where('id', $existingId)->update($attributes);
            $this->info("Updated {$role}: {$email}");
        } else {
            DB::table('employees')->insert($attributes + [
                'email' => $email,
                'created_at' => now(),
            ]);
            $this->info("Created {$role}: {$email}");
        }

        $this->line($role === 'Admin'
            ? 'Sign in at /office/admin/login'
            : 'Sign in at /office/login');

        return self::SUCCESS;
    }
}
